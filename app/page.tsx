import dynamic from "next/dynamic";

const App = dynamic(() => import("../components/BraveThemSteelThread"), { ssr: false });

export default function Page() {
  return <App />;
}
