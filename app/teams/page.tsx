
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  team_number: number;
  participant_name: string;
};

export default function TeamsPage() {
  const [eventId, setEventId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTeams() {
      const { data: events, error } = await supabase.rpc(
        "get_registration_status"
      );

      if (error || !events || events.length === 0) {
        setErrorMessage("Could not find the quiz event.");
        setLoading(false);
        return;
      }

      const id = events[0].event_id;
      setEventId(id);

     const { data, error: teamsError } = await supabase.rpc(
  "get_revealed_teams",
  { p_event_id: id }
);

if (teamsError) {
  setErrorMessage("Database error: " + teamsError.message);
} else if (data && data.length > 0) {
  setTeams(data);
  setRevealed(true);
}

setLoading(false);
    }

    loadTeams();
  }, []);

  const teamNumbers = Array.from(
    new Set(teams.map((team) => team.team_number))
  ).sort((a, b) => a - b);

  return (
    <main className="register-page">
      <div className="register-card">
        <a href="/" className="back-link">← Home</a>

        <h1>Youth Bible Quiz Teams</h1>

        {loading ? (
          <p>Checking team results...</p>
        ) : errorMessage ? (
          <p>{errorMessage}</p>
        ) : !revealed ? (
          <div>
            <h2>Teams Not Yet Revealed</h2>
            <p>
              The team assignments are being kept private.
              Please check back when the administrator reveals them.
            </p>
          </div>
        ) : (
          <div>
            <h2>Team Assignments</h2>
            <p>All teams have been revealed. Find your team below!</p>

            {teamNumbers.map((number) => (
              <section key={number} className="team-preview">
                <h3>Team {number}</h3>

                {teams
                  .filter((team) => team.team_number === number)
                  .map((team, index) => (
                    <p key={`${number}-${index}`}>
                      {team.participant_name}
                    </p>
                  ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
