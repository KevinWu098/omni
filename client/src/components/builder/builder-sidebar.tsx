import { AllSidePanel } from "@/components/builder/all-side-panel";
import { SingleSidePanel } from "@/components/builder/single/single-side-panel";
import { Test } from "@/components/content";

export function BuilderSidebar({
    activeTest,
    tests,
    setTests,
    setSelectedTest,
    handleRunTest,
    runId,
    sendCommand,
    stepStatuses,
}: {
    activeTest: Test | undefined;
    tests: Test[];
    setTests: React.Dispatch<React.SetStateAction<Test[]>>;
    setSelectedTest: React.Dispatch<React.SetStateAction<Test | null>>;
    handleRunTest: () => void;
    runId: string | null;
    sendCommand: (commands: string[], id: string | undefined) => Promise<void>;
    stepStatuses: Record<number, 'success' | 'failure'>;
}) {
    const handleTestClick = (test: Test) => {
        setSelectedTest(test);
    };

    return activeTest ? (
        <SingleSidePanel
            activeTest={activeTest}
            tests={tests}
            setTests={setTests}
            setSelectedTest={setSelectedTest}
            handleRunTest={handleRunTest}
            runId={runId}
            sendCommand={sendCommand}
            stepStatuses={stepStatuses}
        />
    ) : (
        <AllSidePanel
            tests={tests}
            handleTestClick={handleTestClick}
            setTests={setTests}
        />
    );
}
