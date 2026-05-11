import styles from "./QuantityBadge.module.css";

type QuantityBadgeProps = {
  quantity: number;
};

export function QuantityBadge({ quantity }: QuantityBadgeProps) {
  if (quantity <= 1) return null;
  return <span className={styles.badge}>x{quantity}</span>;
}
