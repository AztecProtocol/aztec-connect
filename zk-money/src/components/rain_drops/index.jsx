/*
 * This animation is inspired and modified from the following repo (demo 5)
 * https://github.com/jackrugile/3d-particle-explorations
 */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import World from './world';

class RainDrops extends PureComponent {
  constructor(props) {
    super(props);

    this.entered = false;
    this.exited = false;
  }

  componentDidMount() {
    const { transition, onTransitionEnd } = this.props;

    this.world = new World(this.canvas, transition === 'fade-in');

    window.addEventListener('resize', this.world.resize);

    if (transition === 'fade-in' && !this.entered) {
      this.entered = true;
      this.world.enter(onTransitionEnd);
    }
  }

  componentDidUpdate() {
    const { transition, onTransitionEnd } = this.props;

    if (transition === 'fade-in' && !this.entered) {
      this.entered = true;
      this.world.enter(onTransitionEnd);
    } else if (transition === 'fade-out' && !this.exited) {
      this.exited = true;
      this.world.exit(onTransitionEnd);
    }
  }

  componentWillUnmount() {
    this.world.stop();
    window.removeEventListener('resize', this.world.resize);
  }

  setCanvasRef = ref => {
    this.canvas = ref;
  };

  render() {
    const { className } = this.props;

    return <canvas className={className} ref={this.setCanvasRef} />;
  }
}

RainDrops.propTypes = {
  className: PropTypes.string,
  transition: PropTypes.oneOf(['', 'fade-in', 'fade-out']),
  onTransitionEnd: PropTypes.func,
};

RainDrops.defaultProps = {
  className: '',
  transition: 'fade-in',
  onTransitionEnd() {},
};

export { RainDrops };
