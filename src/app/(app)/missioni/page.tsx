import { redirect } from "next/navigation";

/** Le missioni sono diventate Quest nel nuovo sistema delle entità. */
export default function MissionsRedirect() {
  redirect("/quest");
}
