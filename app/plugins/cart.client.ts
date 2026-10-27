/** Restores the saved cart from localStorage after the app mounts on the client. */
export default defineNuxtPlugin(() => {
  useCart().hydrate();
});
