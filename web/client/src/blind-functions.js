export function sendCommand(blinds, command) {
  console.log("Received command: ", command);
  console.log(" -> Sending to:", blinds);
  fetch('/api/blinds', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ blinds: blinds, command: command }),
  }).then((response) => {
    return response.text();
  });
}

export const getBlindStates = async () => {
  const resp = await fetch('/api/blinds');
  const body = await resp.json();
  if (resp.status !== 200) throw Error(body.message);
  return body;
}

