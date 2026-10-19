import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from gpiozero import MotionSensor, PWMOutputDevice
import uvicorn

#Global
alive = 0
data = {
    "alarm":False,
    "motion":0,
    "keep_alive":"0"
}

#Initialise the hardware
pir = None
buzzer = None

async def beep(repeat:int):
    """
    Asynchronous beep function.
    Using asyncio.sleep() instead of time.sleep()
    """
    for _ in range(repeat):
        buzzer.value = 0.5
        await asyncio.sleep(0.12)
        buzzer.value = 0
        await asyncio.sleep(0.02)
        
        
async def motion_detection():
    """Background task that runs continiously to monitor the hardware"""
    try:
        while True:
            if pir.is_active:
                print("Motion detected")
                await beep(4)
                data["motion"] = 1
            else:
                data["motion"] = 0
                
            if data["alarm"]:
                await beep(2)
                
            # Yield control back to FastAPI so it can process web requests
            await asyncio.sleep(1)
    except asyncio.CancelledError:
        pass
    
@asynccontextmanager
async def lifespan(app: FastAPI):
    """ Lifespan context manager replace standard threading
    It starts the background task when the server boots and cleans it up on exit"""
    global pir, buzzer
    pir = MotionSensor(23)
    buzzer = PWMOutputDevice(24, frequency=500)

    task = asyncio.create_task(motion_detection())
    yield
    task.cancel()
    buzzer.close()
    pir.close()
    
    
app = FastAPI(lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/")
async def index(request:Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.get("/keep_alive")
async def keep_alive():
    global alive
    alive += 1
    data["keep_alive"] = str(alive)
    return data

@app.post("/status={name}-{action}")
async def status(name:str, action: str):
    if name == "buzzer":
        if action == "on":
            data["alarm"] = True
        elif action == "off":
            data["alarm"] = False
    return "ok"

if __name__ == '__init__':
    uvicorn.run(app, host="172.20.10.2", port = 50000)
