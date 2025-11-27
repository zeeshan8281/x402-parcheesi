import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    // In a real x402 implementation, we would use the x402-next middleware
    // or check for the specific payment proof header.

    // For this demo, we simulate the 402 response.
    const paymentProof = req.headers.get('X-Payment-Proof');

    if (!paymentProof) {
        // Return 402 Payment Required with standard headers
        // The client (x402-fetch) looks for the WWW-Authenticate header or specific JSON body
        return NextResponse.json(
            {
                message: 'Payment required to join the game',
            },
            {
                status: 402,
                headers: {
                    // Standard x402 header format
                    // Token address (USDC on Base Sepolia): 0x036CbD53842c5426634e7929541eC2318f3dCF7e
                    // Amount: 1.0 USDC (1000000 atomic units)
                    'WWW-Authenticate': 'x402 token="0x036CbD53842c5426634e7929541eC2318f3dCF7e", network="84532", amount="1000000", recipient="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"',
                    'Access-Control-Expose-Headers': 'WWW-Authenticate'
                }
            }
        );
    }

    // Verify payment proof
    // The proof is in the 'Authorization' or 'X-Payment-Proof' header
    // For this demo, we'll accept the presence of the header as "verified" 
    // since we can't easily verify on-chain without a backend provider key here.

    const body = await req.json();

    return NextResponse.json({
        success: true,
        player: {
            id: Math.random().toString(36).substr(2, 9),
            name: body.name || 'Anonymous',
            hasPaid: true,
        }
    });
}
