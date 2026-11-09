"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventData = {
  id: string;
  name: string;
  registration_open: boolean;
  teams_generated: boolean;
  teams_revealed: boolean;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [event, setEvent] = useState<EventData | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("admin_user_id", user.id)
        .eq("name", "Youth Bible Quiz")
        .single();

      if (error || !data) {
        setMessage("Your admin event could not be found.");
        setLoading(false);
        return;
      }

      setEvent(data);

      const { count: total, error: countError } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", data.id);

      if (!countError) {
        setCount(total || 0);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function toggleRegistration() {
    if (!event) return;

    const newStatus = !event.registration_open;

    const { error } = await supabase
      .from("events")
      .update({ registration_open: newStatus })
      .eq("id", event.id);

    if (error) {
      setMessage("Could not update registration.");
      return;
    }

    setEvent({ ...event, registration_open: newStatus });
    setMessage(newStatus ? "Registration is now open." : "Registration is closed.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return <main className="register-page">Loading dashboard...</main>;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="brand">YOUTH BIBLE QUIZ</span>
          <h1>Admin Dashboard</h1>
        </div>

        <button onClick={logout} className="logout-button">
          Log Out
        </button>
      </header>

      {message && <p className="admin-message">{message}</p>}

      {event ? (
        <>
          <section className="admin-card">
            <h2>{event.name}</h2>
            <p>Manage your quiz event from here.</p>

            <div className="admin-stat">
              <span>Registered Participants</span>
              <strong>{count}</strong>
            </div>

            <div className="admin-stat">
              <span>Registration Status</span>
              <strong>
                {event.registration_open ? "Open" : "Closed"}
              </strong>
            </div>

            <button
              className="admin-action"
              onClick={toggleRegistration}
            >
              {event.registration_open
                ? "Close Registration"
                : "Open Registration"}
            </button>
          </section>

          <section className="admin-card">
            <h2>Team Management</h2>
            <p>Team generation and reveal controls will be added next.</p>

            <div className="admin-stat">
              <span>Teams Generated</span>
              <strong>{event.teams_generated ? "Yes" : "No"}</strong>
            </div>

            <div className="admin-stat">
              <span>Teams Revealed</span>
              <strong>{event.teams_revealed ? "Yes" : "No"}</strong>
            </div>
          </section>
        </>
      ) : (
        <section className="admin-card">
          <h2>Unable to load event</h2>
          <p>{message}</p>
        </section>
      )}
    </main>
  );
}
