type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
      <p className="text-sm font-medium text-rose-700">{message}</p>
    </div>
  );
}