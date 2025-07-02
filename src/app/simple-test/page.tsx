export default function SimpleTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Simple Test Page</h1>
      <p>This page should load without any issues.</p>
      <div className="mt-4">
        <p>Environment: {process.env.NODE_ENV}</p>
        <p>If you see this, basic Next.js rendering is working correctly.</p>
      </div>
    </div>
  );
}