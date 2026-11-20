
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
type Participant = {
  id: string;
  participant_name: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [event, setEvent] = useState<EventData | null>(null);
  const [count, setCount] = useState(0);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // LOAD TEAMS
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

  // LOAD REGISTERED PARTICIPANTS
  async function loadParticipants(eventId: string) {
    const { data, error } = await supabase
      .from("registrations")
      .select("id, participant_name, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      setMessage("Could not load registered participants.");
      return;
    }

    setParticipants((data || []) as Participant[]);
  }

  // REMOVE PARTICIPANT
  async function removeParticipant(id: string) {
    if (!window.confirm("Are you sure you want to remove this participant?")) {
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "remove_quiz_participant",
      { p_registration_id: id }
    );

    if (error) {
      setMessage(error.message);
    } else if (event) {
      await loadParticipants(event.id);

      const { count: total, error: countError } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      if (!countError) {
        setCount(total || 0);
      }

      setMessage("Participant removed successfully.");
    }

    setBusy(false);
  }

  // LOAD ADMIN DASHBOARD
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

      setEvent(data as EventData);

      const { count: total, error: countError } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", data.id);

      if (!countError) {
        setCount(total || 0);
      }

      await loadParticipants(data.id);

      if (data.teams_generated) {
        await loadTeams(data.id);
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  // OPEN OR CLOSE REGISTRATION
  async function toggleRegistration() {
    if (!event || busy || event.teams_generated) return;

    setBusy(true);
    setMessage("");

    const { error } = await supabase
      .from("events")
      .update({
        registration_open: !event.registration_open
      })
      .eq("id", event.id);

    if (error) {
      setMessage(error.message);
    } else {
      setEvent({
        ...event,
        registration_open: !event.registration_open
      });

      setMessage(
        !event.registration_open
          ? "Registration is now open."
          : "Registration is now closed."
      );
    }

    setBusy(false);
  }

  // GENERATE RANDOM TEAMS
  async function generateTeams() {
    if (!event || busy) return;

    if (event.registration_open) {
      setMessage("Please close registration before generating teams.");
      return;
    }

    if (!window.confirm(
      "Generate random teams now? This action cannot be undone without resetting the event."
    )) {
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "generate_event_teams",
      { p_event_id: event.id }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setEvent({
        ...event,
        teams_generated: true,
        teams_revealed: false
      });

      await loadTeams(event.id);
      setMessage("Teams generated successfully!");
    }

    setBusy(false);
  }

  // REVEAL TEAMS
  async function revealTeams() {
    if (!event || busy) return;

    if (!window.confirm(
      "Are you sure you want to reveal all teams to participants?"
    )) {
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
      setEvent({
        ...event,
        teams_revealed: true
      });

      setMessage("All teams have been revealed!");
    }

    setBusy(false);
  }

  // RESET EVENT
  async function resetEvent() {
    if (!event || busy) return;

    if (!window.confirm(
      "Are you sure? This will permanently delete all registrations and generated teams for this event."
    )) {
      return;
    }

    setBusy(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "reset_quiz_event",
      { p_event_id: event.id }
    );

    if (error) {
      setMessage(error.message);
    } else {
      setEvent({
        ...event,
        registration_open: false,
        teams_generated: false,
        teams_revealed: false
      });

      setParticipants([]);
      setTeams([]);
      setCount(0);
      setSearchTerm("");

      setMessage("Event reset successfully. Registration is closed.");
    }

    setBusy(false);
  }

  // LOGOUT
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (loading) {
    return (
      <main className="admin-dashboard">
        <p>Loading dashboard...</p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="admin-dashboard">
        <p>{message || "Unable to load dashboard."}</p>
        <button onClick={logout}>Logout</button>
      </main>
    );
  }

  const filteredParticipants = participants.filter((participant) =>
    participant.participant_name
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <main className="admin-dashboard">

      <header className="admin-header">
        <h1>Youth Bible Quiz</h1>
        <p>Admin Dashboard</p>
        <button onClick={logout}>Logout</button>
      </header>

      {message && (
        <p className="admin-message">{message}</p>
      )}

      <section className="admin-card">
        <h2>Event Overview</h2>

        <div className="admin-stat">
          <span>Event Name</span>
          <strong>{event.name}</strong>
        </div>

        <div className="admin-stat">
          <span>Total Registered Participants</span>
          <strong>{count}</strong>
        </div>

        <div className="admin-stat">
          <span>Registration Status</span>
          <strong>
            {event.registration_open ? "Open" : "Closed"}
          </strong>
        </div>

        <div className="admin-stat">
          <span>Teams Generated</span>
          <strong>{event.teams_generated ? "Yes" : "No"}</strong>
        </div>

        <div className="admin-stat">
          <span>Teams Revealed</span>
          <strong>{event.teams_revealed ? "Yes" : "No"}</strong>
        </div>
      </section>

      {/* REGISTERED PARTICIPANTS */}
      <section className="admin-card">
        <h2>Registered Participants</h2>

        <p>Total registered: {participants.length}</p>

        <input
          type="text"
          placeholder="Search participants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {filteredParticipants.length > 0 ? (
          filteredParticipants.map((participant) => (
            <div key={participant.id} className="admin-stat">
              <span>{participant.participant_name}</span>

              <button
                onClick={() => removeParticipant(participant.id)}
                disabled={busy || event.teams_generated}
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <p>
            {participants.length === 0
              ? "No participants have registered yet."
              : "No matching participants found."}
          </p>
        )}
      </section>

      {/* REGISTRATION MANAGEMENT */}
      <section className="admin-card">
        <h2>Registration Management</h2>

        <button
          onClick={toggleRegistration}
          disabled={busy || event.teams_generated}
        >
          {event.registration_open
            ? "Close Registration"
            : "Open Registration"}
        </button>
      </section>

      {/* TEAM MANAGEMENT */}
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
            onClick={generateTeams}
            disabled={busy || event.registration_open || count === 0}
          >
            Generate Random Teams
          </button>
        )}

        {event.teams_generated && !event.teams_revealed && (
          <button onClick={revealTeams} disabled={busy}>
            Reveal All Teams
          </button>
        )}

        {event.teams_revealed && (
          <p>All teams have been revealed to participants.</p>
        )}
      </section>

     
            {/* PRIVATE TEAM PREVIEW */}
      {event.teams_generated && (
        <section className="admin-card">
          <h2>Private Team Preview</h2>

          {teams.map((team) => (
            <div key={team.team_number} className="admin-stat">
              <div>
                <strong>Team {team.team_number}</strong>

                {team.registrations && (
                  <p>{team.registrations.participant_name}</p>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* EVENT RESET */}
      <section className="admin-card">
        <h2>Event Controls</h2>

        <button
          onClick={resetEvent}
          disabled={busy}
        >
          Reset Event
        </button>
      </section>

    </main>
  );
}
