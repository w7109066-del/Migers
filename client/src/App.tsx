import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import { NotFoundPage } from "@/pages/not-found";
import { ErrorBoundary } from "react-error-boundary";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary to-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function ErrorFallback({error, resetErrorBoundary}: {error: Error, resetErrorBoundary: () => void}) {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button 
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/app/*" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;