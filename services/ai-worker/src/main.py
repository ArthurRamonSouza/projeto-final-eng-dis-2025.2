import os
import time


def main() -> None:
    interval = int(os.environ.get("AI_WORKER_INTERVAL_SEC", "30"))
    print("ai-worker started", flush=True)
    while True:
        print("ai-worker heartbeat", flush=True)
        time.sleep(interval)


if __name__ == "__main__":
    main()
