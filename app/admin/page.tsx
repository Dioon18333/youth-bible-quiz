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

type TeamRow = {
  team_number: number;
  registrations: {
    participant_name: string;
  } | null;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [event, setEvent] = useState<EventData | null>(null);
  const [count, setCount] = useState(0);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadTeams(eventId: string) {
    const { data, error } = await supabase
      .from("teams")
      .select("team_number, registrations(participant_name)")
      .eq("event_id", eventId)
      .order("team_number");

    if (error) {
      setMessage("Could not load team preview.");
      return;
    }

    setTeams((data || []) as TeamRow[]);
  }

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

      if (data.teams_generated) {
        await loadTeams(data.id);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function toggleRegistration() {
    if (!event || busy) return;

    setBusy(true);
    setMessage("");

    const newStatus = !event.registration_open;

    const { error } = await supabase
      .from("events")
      .update({ registration_open: newStatus })
      .eq("id", event.id);

    if (error) {
      setMessage("Could not update registration.");
    } else {
      setEvent({ ...event, registration_open: newStatus });
      setMessage(newStatus ? "Registration is now open." : "Registration is closed.");
    }

    setBusy(false);
  }

  async function generateTeams() {
    if (!event || busy) return;

    if (!window.confirm("Generate random teams now? This cannot be undone through this dashboard.")) {
      return;
    }

    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.rpc(
      "generate_event_teams",
      { p_event_id: event.id }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setEvent({ ...event, teams_generated: true });
      await loadTeams(event.id);
      setMessage(`Success! ${data} random teams generated.`);
    }

    setBusy(false);
  }

  async function revealTeams() {
    if (!event || busy) return;

    if (!window.confirm("Reveal all teams to participants?")) {
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "reveal_event_teams",
      { p_event_id: event.id }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setEvent({ ...event, teams_revealed: true });
      setMessage("All teams have been revealed!");
    }

    setBusy(false);
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
              <span>Registration</span>
              <strong>{event.registration_open ? "Open" : "Closed"}</strong>
            </div>

            <button
              className="admin-action"
              onClick={toggleRegistration}
              disabled={busy || event.teams_generated}
            >
              {event.registration_open ? "Close Registration" : "Open Registration"}
            </button>
          </section>

          <section className="admin-card">
            <h2>Team Management</h2>

            <div className="admin-stat">
              <span>Teams Generated</span>
              <strong>{event.teams_generated ? "Yes" : "No"}</strong>
            </div>

            <div className="admin-stat">
              <span>Teams Revealed</span>
              <strong>{event.teams_revealed ? "Yes" : "No"}</strong>
            </div>

            {!event.teams_generated && (
              <button
                className="admin-action"
                onClick={generateTeams}
                disabled={busy || event.registration_open || count === 0}
              >
                {busy ? "Please wait..." : "Generate Random Teams"}
              </button>
            )}

            {event.teams_generated && !event.teams_revealed && (
              <button
                className="admin-action"
                onClick={revealTeams}
                disabled={busy}
              >
                {busy ? "Please wait..." : "Reveal All Teams"}
              </button>
            )}
          </section>

          {event.teams_generated && (
            <section className="admin-card">
              <h2>Private Team Preview</h2>
              <p>Only you can see these assignments before the reveal.</p>

              {Array.from(new Set(teams.map((team) => team.team_number))).map(
                (number) => (
                  <div key={number} className="team-preview">
                    <h3>Team {number}</h3>
                    {teams
                      .filter((team) => team.team_number === number)
                      .map((team, index) => (
                        <p key={`${number}-${index}`}>
                          {team.registrations?.participant_name}
                        </p>
                      ))}
                  </div>
                )
              )}
            </section>
          )}
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
