export default function Auth() {
  const handleLogin = () => {
    
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900">
      <div className="w-96 bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Welcome back
        </h1>

        <p className="text-center text-gray-500 mb-8">
          Sign in to your account
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            className="
              w-full
              px-4
              py-3
              rounded-xl
              border
              border-gray-300
              text-gray-800
              outline-none
              transition
              focus:ring-2
              focus:ring-blue-500
              focus:border-transparent
            "
          />

          <input
            type="password"
            placeholder="Password"
            className="
              w-full
              px-4
              py-3
              rounded-xl
              border
              border-gray-300
              text-gray-800
              outline-none
              transition
              focus:ring-2
              focus:ring-blue-500
              focus:border-transparent
            "
          />

          <button
            onClick={handleLogin}
            className="
              w-full
              py-3
              rounded-xl
              bg-blue-600
              text-white
              font-semibold
              shadow-lg
              transition
              hover:bg-blue-700
              active:scale-95
            "
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}