import { BoxArrowUpIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

function App() {
  return (
    <>
      <section className="grid min-h-screen w-full place-items-center bg-primary/80 py-20 text-white">
        <div className="container">
          <div className="flex flex-col items-center space-y-3">
            <BoxArrowUpIcon weight="duotone" size={48} color="currentColor" />
            <h1 className="text-6xl">Coming soon.</h1>
            <p className="text-xl">Stay tuned to find out when we launch.</p>
            <Button variant="secondary">Click me</Button>
          </div>
        </div>
      </section>
    </>
  );
}

export default App;
