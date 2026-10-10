import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";

const Admin = lazy(() => import("./pages/Admin"));
const Auth = lazy(() => import("./pages/Auth"));

const RouteLoadingFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#070b14] text-slate-400">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      <span className="text-xs font-mono tracking-widest uppercase text-slate-400">Loading Console...</span>
    </div>
  </div>
);

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Auth />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
