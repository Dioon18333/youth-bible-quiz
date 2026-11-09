"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    alert("Registration system is being connected. Please check back soon!");
  }

  return (
    <main className="register-page">
      <div className="register-card">
        <a href="/" className="back-link">← Home</a>

        <h1>Join the Quiz!</h1>

        <p>
          Enter your name below to register for Youth Bible Quiz.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Full name</label>

          <input
            id="name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />

          <button type="submit" disabled={!name.trim()}>
            Register
          </button>
        </form>

        <small>Your team will be randomly assigned.</small>
      </div>
    </main>
  );
}
