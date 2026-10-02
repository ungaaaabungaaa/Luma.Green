import {
  RoleStoryImage,
  type StoryScene,
} from "@/components/showcase/role-story-image";

/** Full-width public-page artwork, with a taller crop on small screens. */
export function PageBanner({ scene }: { scene: StoryScene }) {
  return (
    <div data-page-banner className="w-full min-w-0">
      <RoleStoryImage
        scene={scene}
        frameClassName="aspect-[16/7] sm:aspect-[3/1] lg:aspect-[4/1]"
        sizes="(min-width: 1280px) 1184px, (min-width: 1024px) calc(100vw - 96px), (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)"
      />
    </div>
  );
}
