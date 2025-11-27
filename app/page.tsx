'use client';

import { useState, useEffect } from 'react';
import Board from './components/Board';
import PaymentModal from './components/PaymentModal';
import { initializeGame, rollDice, movePawn, performCpuTurn, skipTurn } from './lib/gameLogic';
import { GameState } from './lib/types';
import styles from './page.module.css';

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(initializeGame());
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [playerName, setPlayerName] = useState('');

  const handleJoin = async () => {
    if (!playerName) {
      alert('Please enter your name');
      return;
    }

    // Check for wallet
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('Please install a crypto wallet like MetaMask or Coinbase Wallet to play.');
      return;
    }

    try {
      // 1. Connect Wallet
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];

      // 2. Switch to Base Sepolia (Chain ID 84532)
      try {
        await (window as any).ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }], // 84532 in hex
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0x14a34',
                  chainName: 'Base Sepolia',
                  rpcUrls: ['https://sepolia.base.org'],
                  nativeCurrency: {
                    name: 'Ether',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  blockExplorerUrls: ['https://sepolia.basescan.org'],
                },
              ],
            });
          } catch (addError) {
            console.error(addError);
            return;
          }
        } else {
          console.error(switchError);
          return;
        }
      }

      // 3. Attempt to join (will trigger 402)
      // We manually handle the 402 flow here to show the modal and then pay
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName }),
      });

      if (res.status === 402) {
        const authHeader = res.headers.get('WWW-Authenticate');
        if (authHeader) {
          // Parse x402 params
          // Example: x402 token="...", network="...", amount="...", recipient="..."
          const params: any = {};
          authHeader.replace('x402 ', '').split(',').forEach(part => {
            const [key, value] = part.trim().split('=');
            if (key && value) params[key] = value.replace(/"/g, '');
          });

          setPaymentDetails({
            amount: (parseInt(params.amount) / 1000000).toFixed(2), // USDC has 6 decimals
            currency: 'USDC',
            recipient: params.recipient,
            tokenAddress: params.token,
            rawAmount: params.amount
          });
          setShowPayment(true);
        }
      } else if (res.ok) {
        const data = await res.json();
        setJoined(true);
        const newState = { ...gameState };
        newState.players[0].name = data.player.name;
        newState.players[0].hasPaid = true;
        setGameState(newState);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to join game. See console for details.');
    }
  };

  const handlePayment = async () => {
    if (!paymentDetails) return;

    try {
      // Import viem dynamically to avoid SSR issues
      const { createWalletClient, custom, parseAbi } = await import('viem');
      const { baseSepolia } = await import('viem/chains');

      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: custom((window as any).ethereum!)
      });

      const [address] = await walletClient.getAddresses();

      // ERC20 Transfer ABI
      const abi = parseAbi(['function transfer(address to, uint256 amount) returns (bool)']);

      // Send Transaction
      const hash = await walletClient.writeContract({
        address: paymentDetails.tokenAddress as `0x${string}`,
        abi,
        functionName: 'transfer',
        args: [paymentDetails.recipient as `0x${string}`, BigInt(paymentDetails.rawAmount)],
        account: address,
      });

      console.log('Transaction sent:', hash);

      // Wait for a bit (in real app, wait for receipt)
      // Then retry the join request with the hash as proof

      // Retry join with proof
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Proof': hash
        },
        body: JSON.stringify({ name: playerName }),
      });

      if (res.ok) {
        const data = await res.json();
        setJoined(true);
        setShowPayment(false);

        const newState = { ...gameState };
        newState.players[0].name = data.player.name;
        newState.players[0].hasPaid = true;
        setGameState(newState);
      }
    } catch (err) {
      console.error(err);
      alert('Payment failed. Please try again.');
    }
  };

  // CPU Turn Effect
  useEffect(() => {
    if (!joined) return;

    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer.isCpu && !gameState.winner) {
      const timer = setTimeout(() => {
        setGameState(prev => performCpuTurn(prev));
      }, 1000); // 1 second delay for realism

      return () => clearTimeout(timer);
    }
  }, [gameState.currentTurn, joined, gameState.winner, gameState.players]);

  // Auto-skip if no moves possible
  useEffect(() => {
    if (gameState.dice.length > 0 && !gameState.players[gameState.currentTurn].isCpu) {
      // Import dynamically or assume it's available since we imported it at top
      // But we need to import hasValidMoves from lib/gameLogic
      // It is already imported at top of file
      const { hasValidMoves } = require('./lib/gameLogic');
      if (!hasValidMoves(gameState)) {
        const timer = setTimeout(() => {
          setGameState(prev => skipTurn(prev));
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [gameState.dice, gameState.currentTurn, gameState.players]);

  const handleRoll = () => {
    setGameState(prev => rollDice(prev));
  };

  const handleSkip = () => {
    setGameState(prev => skipTurn(prev));
  };

  const handlePawnClick = (pawnId: string) => {
    // Check if it's current player's pawn
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!pawnId.startsWith(currentPlayer.color)) return;

    // Check if dice rolled
    if (gameState.dice.length === 0) return;

    // Move logic (simplified: use sum of dice)
    const steps = gameState.dice.reduce((a, b) => a + b, 0);
    setGameState(prev => movePawn(prev, pawnId, steps));
  };

  if (!joined) {
    return (
      <main className={styles.main}>
        <div className={`${styles.lobby} glass-panel`}>
          <h1 className={`${styles.title} animate-pulse-glow`}>
            PARCHEESI
          </h1>
          <p className={styles.subtitle}>High Stakes. Winner Takes All.</p>

          <div className={styles.form}>
            <input
              type="text"
              placeholder="Enter your name"
              className={styles.input}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <button className="btn-primary" onClick={handleJoin}>
              Join Game
            </button>
          </div>

          <div className={styles.footer}>
            <span>Powered by x402</span>
            <span>•</span>
            <span>USDC on Base</span>
          </div>
        </div>

        {showPayment && paymentDetails && (
          <PaymentModal
            amount={paymentDetails.amount}
            currency={paymentDetails.currency}
            address={paymentDetails.recipient}
            onPay={handlePayment}
            onCancel={() => setShowPayment(false)}
          />
        )}
      </main>
    );
  }

  if (gameState.winner) {
    return (
      <main className={styles.main}>
        <div className={`${styles.lobby} glass-panel`}>
          <h1 className={`${styles.title} animate-pulse-glow`}>
            GAME OVER
          </h1>
          <p className={styles.subtitle}>
            Winner: <span style={{ color: `var(--player-${gameState.winner})`, textTransform: 'capitalize' }}>{gameState.winner}</span>
          </p>
          <p className={styles.subtitle} style={{ color: 'var(--accent)', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Takes the Pot!
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Play Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.gameContainer}>
      <div className={styles.boardContainer}>
        <Board gameState={gameState} onPawnClick={handlePawnClick} />
      </div>

      <div className={`${styles.sidebar} glass-panel`}>
        <h2 className={styles.playerName}>Game Status</h2>

        <div className={styles.form}>
          <div className={styles.statusCard}>
            <p className={styles.label}>Current Turn</p>
            <p className={styles.playerName} style={{ color: `var(--player-${gameState.players[gameState.currentTurn].color})` }}>
              {gameState.players[gameState.currentTurn].name}
            </p>
          </div>

          <div className={styles.statusCard}>
            <p className={styles.label}>Dice</p>
            <div className={styles.diceContainer}>
              {gameState.dice.length > 0 ? (
                gameState.dice.map((d, i) => (
                  <div key={i} className={styles.die}>
                    {d}
                  </div>
                ))
              ) : (
                <div className={styles.label}>Waiting to roll...</div>
              )}
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <button
              className="btn-primary"
              onClick={handleRoll}
              disabled={!gameState.canRoll}
              style={{ opacity: !gameState.canRoll ? 0.5 : 1, flex: 1 }}
            >
              Roll Dice
            </button>

            {!gameState.canRoll && !gameState.players[gameState.currentTurn].isCpu && (
              <button
                className="btn-primary"
                onClick={handleSkip}
                style={{ background: '#ef4444', flex: 1 }}
              >
                Skip Turn
              </button>
            )}
          </div>

          <div className={styles.logs}>
            <h3 className="font-bold mb-2">Logs</h3>
            <div className={styles.logList}>
              {gameState.logs.slice().reverse().map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
