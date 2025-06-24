'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Algo deu errado!</h2>
      <p>Ocorreu um erro inesperado.</p>
      <button onClick={() => reset()}>Tentar novamente</button>
    </div>
  );
} 