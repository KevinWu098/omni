import { AllSidePanel } from "@/components/builder/all-side-panel";
import { SingleSidePanel } from "@/components/builder/single/single-side-panel";
import { Test } from "@/components/content";

export function BuilderSidebar({
    activeTest,
    tests,
    setTests,
    setSelectedTest,
    handleRunTest,
}: {
    activeTest: Test | undefined;
    tests: Test[];
    setTests: React.Dispatch<React.SetStateAction<Test[]>>;
    setSelectedTest: React.Dispatch<React.SetStateAction<Test | null>>;
    handleRunTest: () => void;
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
        />
    ) : (
        <AllSidePanel
            tests={tests}
            handleTestClick={handleTestClick}
            setTests={setTests}
        />
    );
}
