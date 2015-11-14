function getDocumentQueryArg(key: string): string {
  var query = window.location.search.substring(1);
  console.log(query);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == key) {
      return decodeURIComponent(pair[1]);
    }
  }
  return null;
}