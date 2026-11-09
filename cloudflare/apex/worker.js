// citytourbus.kr -> https://www.citytourbus.kr (same path and query), as Vercel does today.
export default {
  fetch(request) {
    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = 'www.citytourbus.kr';
    return Response.redirect(url.toString(), 301);
  },
};
