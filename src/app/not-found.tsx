import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>That film or page does not exist here. It may have been removed from the catalog.</p>
      <p>
        <Link href="/">Go to the home page</Link> or <Link href="/search">search for a film</Link>.
      </p>
    </>
  );
}
