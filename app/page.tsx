export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="brand">YOUTH BIBLE QUIZ</div>

        <div className="hero-content">
          <span className="tag">BIBLE QUIZ EVENT</span>

          <h1>Test Your Knowledge.<br />Build Your Team.</h1>

          <p>
            Welcome to Youth Bible Quiz! Register to participate
            and get randomly assigned to a team.
          </p>

          <a href="/register" className="primary-button">
            Register Now
          </a>

          <p className="small-text">
            Team assignments will be revealed when the organizer is ready.
          </p>
        </div>
      </section>
    </main>
  );
}
