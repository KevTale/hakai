export function allowEnter(id: string) {
  if (isAuthenticated() && id !== undefined) {
    return true;
  }
  return redirect("/login");
}

export function allowExit() {
  // ...
}
