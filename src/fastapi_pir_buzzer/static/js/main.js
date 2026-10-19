const heartBeatRate = 1000;
let aliveTimestamp = Date.now();

document.addEventListener("DOMContentLoaded", () =>{
	const connectionBadge = document.getElementById("connection_badge");
	const motionBadge = document.getElementById("motion_badge");
	const buzzerSwitch = document.getElementById("buzzer");

	buzzerSwitch.addEventListener("change", (e) =>{
		const state = e.target.checked ? "on" : "off";
		sendEvent(`${e.target.id}-${state}`);
	});
	setTimeout(() => checkConnectionTimeout(connectionBadge, motionBadge), heartBeatRate);
	pollServer(motionBadge);
});

function checkConnectionTimeout(connectionBadge, motionBadge){
	const currentTime = Date.now();

	if(currentTime - aliveTimestamp > heartBeatRate + 1000)
	{
		updateBadge(connectionBadge, "Offline", "bg-danger", "bg-success");
		updateBadge(motionBadge, "Unknown", "bg-secondary", "bg-primary", "bg-success", "bg-danger");
	}
	else
	{
		updateBadge(connectionBadge, "Online", "bg-success", "bg-danger", "bg-secondary");
	}
	setTimeout(() => checkConnectionTimeout(connectionBadge, motionBadge), heartBeatRate);
}

function pollServer(motionBadge)
{
	fetch('/keep_alive')
		.then(response => {
			if(!response.ok) throw new Error("Server error");
			aliveTimestamp = Date.now();
			return response.json();
		})
		.then(data =>{
			if(data.motion === 1)
			{
				updateBadge(motionBadge, "Motion Detected", "bg-danger", "bg-success", "bg-secondary");
			}
			else
			{
				updateBadge(motionBadge, "Clear", "bg-success", "bg-danger", "bg-secondary");
			}
		})
	.catch(error => 
		{
			console.error("Polling failed:", error);
		})
	.finally(() => 
		{
			setTimeout(() => pollServer(motionBadge), heartBeatRate);
		});
}

function sendEvent(value)
{
	fetch(`/status=${value}`, {method:"POST"})
		.catch(error => console.error("Failed to send command: ", error));
}

function updateBadge(element, text, classToAdd, ...classesToRemove)
{
	console.log(`Trying to change text to: ${text}`);
	if(element.innerText !== text)
	{
		element.innerText = text;
	}
	classesToRemove.forEach(cls => element.classList.remove(cls));
	element.classList.add(classToAdd);
}

