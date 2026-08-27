import { describe, expect, it } from "bun:test";

interface IsrExpectation {
  path: string;
  revalidateSeconds: number;
}

const ISR_EXPECTATIONS: IsrExpectation[] = [
  {
    path: "./exoplanets/[id]/page.tsx",
    revalidateSeconds: 14 * 24 * 60 * 60,
  },
  {
    path: "./stars/[id]/page.tsx",
    revalidateSeconds: 30 * 24 * 60 * 60,
  },
  {
    path: "./small-bodies/[id]/page.tsx",
    revalidateSeconds: 7 * 24 * 60 * 60,
  },
];

describe("public catalog detail ISR", () => {
  for (const expectation of ISR_EXPECTATIONS) {
    it(`caches ${expectation.path} on demand`, async () => {
      const source = await Bun.file(
        new URL(expectation.path, import.meta.url),
      ).text();

      expect(source).toContain('export const dynamic = "force-static";');
      expect(source).toContain(
        `export const revalidate = ${expectation.revalidateSeconds};`,
      );
      expect(source).toMatch(
        /export function generateStaticParams\(\): Array<\{ id: string \}> \{\s*return \[\];\s*\}/,
      );
    });
  }
});
