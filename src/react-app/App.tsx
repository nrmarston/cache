import { BoxArrowUpIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

function App() {	

	return (
		<>
			<section className="py-20 min-h-screen bg-primary/80 text-white grid place-items-center w-full">
				<div className="container">
					<div className="flex flex-col items-center  space-y-3">
						<BoxArrowUpIcon weight="duotone"  size={48} color="currentColor"  />
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
