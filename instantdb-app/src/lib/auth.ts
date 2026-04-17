// InstantDB magic-link auth helpers + dev fallback.
//
// Production flow: user enters email → InstantDB sends magic-link code
// → user enters code → InstantDB issues a session. We then look up (or
// create) the matching userProfiles row keyed by the user's email.
//
// Dev fallback: when NEXT_PUBLIC_DEV_USER_EMAIL is set, queries return
// the seeded courseMember for that email without going through auth.
// TODO: remove the dev fallback before any production deploy.
import db from "./instant";

const DEV_EMAIL = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;

if (DEV_EMAIL) {
  // eslint-disable-next-line no-console
  console.warn(`[auth] DEV FALLBACK ACTIVE: pretending to be ${DEV_EMAIL}`);
}

export type CurrentUser = {
  email: string;
  isDev: boolean;
};

export function useCurrentUser(): CurrentUser | null {
  if (DEV_EMAIL) {
    return { email: DEV_EMAIL, isDev: true };
  }
  const auth = db.useAuth();
  if (auth.isLoading || auth.error || !auth.user) return null;
  return { email: auth.user.email, isDev: false };
}

export function useCurrentCourseMember(courseSlug = "lqwg-adhan") {
  const user = useCurrentUser();
  const { data } = db.useQuery(
    user
      ? {
          courseMembers: {
            $: {
              where: {
                "course.slug": courseSlug,
                "profile.email": user.email,
              },
            },
            profile: {},
            course: {},
          },
        }
      : null,
  );
  return data?.courseMembers?.[0] ?? null;
}

export async function sendMagicCode(email: string): Promise<void> {
  await db.auth.sendMagicCode({ email });
}

export async function signInWithCode(email: string, code: string): Promise<void> {
  await db.auth.signInWithMagicCode({ email, code });
}

export function signOut(): void {
  db.auth.signOut();
}
