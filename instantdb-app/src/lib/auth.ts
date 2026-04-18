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

export type CurrentUserState = {
  user: CurrentUser | null;
  isLoading: boolean;
};

export function useCurrentUser(): CurrentUserState {
  if (DEV_EMAIL) {
    return { user: { email: DEV_EMAIL, isDev: true }, isLoading: false };
  }
  const auth = db.useAuth();
  if (auth.isLoading) return { user: null, isLoading: true };
  if (auth.error || !auth.user || !auth.user.email) return { user: null, isLoading: false };
  return { user: { email: auth.user.email, isDev: false }, isLoading: false };
}

export function useCurrentCourseMember(courseSlug = "lqwg-adhan") {
  const { user } = useCurrentUser();
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

export type AuthorizationState = "loading" | "authorized" | "unauthorized";

export function useIsAuthorizedMember(courseSlug = "lqwg-adhan"): AuthorizationState {
  const { user, isLoading } = useCurrentUser();
  const { data, error } = db.useQuery(
    user
      ? {
          courseMembers: {
            $: {
              where: {
                "course.slug": courseSlug,
                "profile.email": user.email,
              },
            },
          },
        }
      : null,
  );
  if (isLoading) return "loading";
  if (!user) return "unauthorized";
  if (error) return "loading"; // treat transient errors as loading, not signOut
  if (data === undefined) return "loading";
  return data.courseMembers?.[0] ? "authorized" : "unauthorized";
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
