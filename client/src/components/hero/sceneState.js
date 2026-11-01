export const HERO_POSE = { camZ: 7.2, camY: 0.1, posX: 0.24, rotY: -0.35, rotX: 0, scale: 1, explode: 0, light: 1 };
export const createSceneState = () => ({
    ...HERO_POSE, intro: 0, introT: 0, ambient: true, yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, invalidate: null,
});
