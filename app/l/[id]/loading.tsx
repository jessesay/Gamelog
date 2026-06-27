export default function PublicListLoading() {
  return (
    <main className="shell public-page-shell" aria-busy="true">
      <section className="hero public-list-hero">
        <div className="hero-card list-loading-hero-v37"><p className="eyebrow">GameLog list</p><h1>Loading this list...</h1></div>
        <div className="list-public-fallback-v37"><span>GL</span><small>Loading</small></div>
      </section>
    </main>
  );
}
