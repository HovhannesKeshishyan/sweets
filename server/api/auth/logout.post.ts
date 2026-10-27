export default defineEventHandler(async (event) => {
  await endUserSession(event);
  setResponseStatus(event, 204);
  return null;
});
