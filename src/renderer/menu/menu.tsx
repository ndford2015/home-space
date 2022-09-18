/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { ItemType } from 'renderer/constants';
import './menu.global.scss';

interface MenuProps {
  addItem(type: ItemType): void;
}

const Menu = (props: MenuProps) => {
  const [open, setOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const addItem = (type: ItemType): void => {
    props.addItem(type);
    setOpen(false);
    setAddMenuOpen(false);
  };

  const getAddMenu = () => {
    if (!addMenuOpen) {
      return null;
    }
    return (
      <div className="add-menu">
        <span onClick={() => addItem(ItemType.NOTE)}>Note</span>
      </div>
    );
  };

  const getMenuItems = () => {
    return (
      <div className="menu-container">
        <span onClick={() => setAddMenuOpen(!addMenuOpen)}>Add ...</span>
        {getAddMenu()}
      </div>
    );
  };
  // TODO: clean up duplication
  return !open ? (
    <div className="home-menu">
      <div className="menu-icon-container">
        <FaBars
          onClick={() => setOpen(true)}
          className="home-menu-icon"
          size={30}
        />
        <h1 color="white">HomeSpace</h1>
      </div>
    </div>
  ) : (
    <div className="home-menu">
      <div className="menu-icon-container">
        <FaTimes
          onClick={() => setOpen(false)}
          className="home-menu-icon"
          size={30}
        />
        <h1 color="white">HomeSpace</h1>
      </div>
      {getMenuItems()}
    </div>
  );
};

export default Menu;
