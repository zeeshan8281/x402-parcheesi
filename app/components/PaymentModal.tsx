import React from 'react';
import styles from './PaymentModal.module.css';

interface PaymentModalProps {
    amount: string;
    currency: string;
    address: string;
    onPay: () => void;
    onCancel: () => void;
}

export default function PaymentModal({ amount, currency, address, onPay, onCancel }: PaymentModalProps) {
    return (
        <div className={styles.overlay}>
            <div className={`${styles.modal} glass-panel`}>
                <h2>Payment Required</h2>
                <p>To join this high-stakes Parcheesi game, you must stake your entry fee.</p>

                <div className={styles.details}>
                    <div className={styles.row}>
                        <span>Amount:</span>
                        <strong>{amount} {currency}</strong>
                    </div>
                    <div className={styles.row}>
                        <span>To Address:</span>
                        <code className={styles.address}>{address}</code>
                    </div>
                </div>

                <div className={styles.info}>
                    <p>Powered by <strong>x402 Protocol</strong></p>
                    <p className={styles.sub}>Winner Takes All!</p>
                </div>

                <div className={styles.actions}>
                    <button className="btn-primary" onClick={onPay}>Pay & Join</button>
                    <button className={styles.cancel} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
