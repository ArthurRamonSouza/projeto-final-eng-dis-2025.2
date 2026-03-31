import { AppButton } from "./AppButton";

type RefillButtonProps = {
  onClick: () => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
};

export function RefillButton({
  onClick,
  disabled = false,
  isLoading = false,
}: RefillButtonProps) {
  return (
    <AppButton
      type="button"
      variant="success"
      onClick={() => void onClick()}
      disabled={disabled}
      isLoading={isLoading}
    >
      Solicitar refill manual
    </AppButton>
  );
}