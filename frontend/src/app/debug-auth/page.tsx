"use client";

import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useState } from "react";

export default function DebugAuthPage() {
  const { getToken, isSignedIn } = useClerkAuth();
  const [token, setToken] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGetToken = async () => {
    try {
      const t = await getToken();
      setToken(t);
      console.log("Token obtenido:", t);
    } catch (err: any) {
      setError(err.message);
      console.error("Error obteniendo token:", err);
    }
  };

  const handleTestAPI = async () => {
    try {
      const t = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${t}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      setApiResponse({
        status: response.status,
        statusText: response.statusText,
        data,
      });
      console.log("Respuesta API:", { status: response.status, data });
    } catch (err: any) {
      setError(err.message);
      console.error("Error llamando API:", err);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Debug de Autenticación</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Estado de Clerk:</h2>
          <p>isSignedIn: {isSignedIn ? "Sí" : "No"}</p>
          <p>API URL: {process.env.NEXT_PUBLIC_API_URL}</p>
          <p>DEV MODE: {process.env.NEXT_PUBLIC_DEV_MODE}</p>
        </div>

        <button
          onClick={handleGetToken}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Obtener Token
        </button>

        {token && (
          <div className="bg-green-100 p-4 rounded">
            <h3 className="font-semibold">Token:</h3>
            <p className="text-xs break-all">{token}</p>
          </div>
        )}

        <button
          onClick={handleTestAPI}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          Probar API /api/auth/me
        </button>

        {apiResponse && (
          <div className="bg-yellow-100 p-4 rounded">
            <h3 className="font-semibold">Respuesta API:</h3>
            <pre className="text-xs">{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}

        {error && (
          <div className="bg-red-100 p-4 rounded">
            <h3 className="font-semibold">Error:</h3>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
