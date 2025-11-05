# ROS Web Sandbox and React UI

This repository provides a ROS 2 Jazzy web interface that connects a React-based frontend (`ros-ui`) with the ROS ecosystem using:

- **rosbridge_websocket** — for WebSocket communication between ROS and the browser  
- **roslibjs** — to interact with ROS topics, services, and parameters in JavaScript  
- **ros3djs** — to visualize 3D ROS data in the browser using Three.js  

The setup is automated through the included `setup.bash` script.

---

## Prerequisites

Before running the setup, make sure the following are installed or configured:

- Ubuntu 24.04 (fully installed and updated)  
  > IMPORTANT: This script does **not** handle OS installation or reboot.  
- Git  
- Node.js (version 18 or newer)  
- npm  

---

## Full Setup Instructions

1. **Create a new project directory and enter it**  

```bash
mkdir -p ~/ros-ui
cd ~/ros-ui
```
2. ***Git clone THIS directory***
```
git clone https://github.com/JordonDJasper/CAVS-React-UI.git
```
3. ***Ensure that all the packages are installed including npm***
```
npm start
```
4. ***Afterwards, the app will open up. If you don't have rosbridge_websocket running in the background, when you go into the views, ROS2 nodes from demo file won't be published/subscribed***
5. Lastly, ensure you have lidar_sampler.py, the demo file(example_ros2bag.db3), and within the ros2_jazzy directory, a bag_files directory for the demo file.

