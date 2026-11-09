"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function loadEvent() {
    
const { data, error } = await supabase
  .rpc("get_registration_status");

if (!error && data && data.length > 0) {
  setEventId(data[0].event_id);
  setIsOpen(data[0].registration_open);
}
      
        setEventId(data.id);
        setIsOpen(data.registration_open);
      }

      setLoading(false);
    }

    loadEvent();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!eventId || !isOpen) return;

    setSubmitting(true);
    setMessage("");

    const { error } = await supabase.rpc("register_participant", {
      p_event_id: eventId,
      p_name: name
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Registration successful! You're on the list.");
      setName("");
    }

    setSubmitting(false);
  }

  return (
    <main className="register-page">
      <div className="register-card">
        <a href="/" className="back-link">← Home</a>

        <h1>Join the Quiz!</h1>

        {loading ? (
          <p>Loading event...</p>
        ) : !isOpen ? (
          <p>Registration is currently closed. Please check back later.</p>
        ) : (
          <>
            <p>Enter your name to register for Youth Bible Quiz.</p>

            <form onSubmit={handleSubmit}>
              <label htmlFor="name">Full name</label>

              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />

              <button type="submit" disabled={submitting || !name.trim()}>
                {submitting ? "Registering..." : "Register"}
              </button>
            </form>
          </>
        )}

        {message && <p role="status">{message}</p>}

        <small>Your team will be randomly assigned.</small>
      </div>
    </main>
  );
}
