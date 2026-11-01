import { Component } from 'react';
// Any failure while loading or running the 3D scene (chunk load, WebGL error) falls back to the static hero.
export class SceneBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { this.props.onError(); }
    render() { return this.state.failed ? null : this.props.children; }
}
