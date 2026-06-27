export default function ListsLoading() {
  return (
    <main className="social-shell-v35" aria-busy="true">
      <section className="social-page-head-v35"><p className="eyebrow">Lists</p><h1>Loading your lists...</h1></section>
      <section className="list-loading-grid-v37">
        {[0, 1, 2].map((item) => <div className="social-card-v35 list-loading-card-v37" key={item}><span /><div><i /><i /><i /></div></div>)}
      </section>
    </main>
  );
}
