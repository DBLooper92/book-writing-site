import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function ProjectsPage() {
  return (
    <PlaceholderPage
      eyebrow="Projects"
      title="Project index"
      description="Future story-bible projects will live under users/{uid}/projects/{projectId}. The development initializer creates the first deterministic project at users/{uid}/projects/default-story-bible."
      placeholderTitle="Projects placeholder"
      placeholderDescription="This page will evolve into the project switcher and project creation surface. For now it documents the intended per-user project structure and provides a stable route for development."
    />
  );
}
