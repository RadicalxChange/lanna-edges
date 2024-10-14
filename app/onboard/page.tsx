import { Claims } from "@auth0/nextjs-auth0";
import OnboardForm from "./onboardForm";
import { getUser } from "@/lib/getUser";
import { Account } from "@/types/account";
import { getAccount } from "@/lib/getAccount";
import SignInButtons from "@/components/signInButtons";

export default async function SignUp() {
    
  const user: Claims | null = await getUser()
  const account: Account | null = user && await getAccount(user.email)

  return (
    <main className="px-4 pb-4 lg:px-24 pt-12 min-h-screen-minus-header">
      <h1 className="text-left text-lg mb-12">Onboard</h1>
      {account && account.is_member ? (
        <p className="text-sm mb-6">You are already onboarded. Have fun using ∈dges!</p>
      ) : (
        account && account.pending_approval ? (
          <p className="text-sm mb-6 max-w-2xl">You already submitted the onboarding form, and the admins are reviewing your account. When your account is verified, you will be credited with 100 ∈.</p>
        ) : (
          user ? (
            <OnboardForm user={user} account={account} />
          ) : (
            <>
            <p className="text-sm mb-6">Get onboarded! Sign in or sign up to get started.</p>
            <div className="w-48">
              <SignInButtons redirectUri="/onboard" />
            </div>
            </>
          )
        )
      )}
    </main>
  );
}
