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

  return !open ? (
    <div className="home-menu">
      <FaBars
        onClick={() => setOpen(true)}
        className="home-menu-icon"
        size={40}
      />
    </div>
  ) : (
    <div className="home-menu">
      <FaTimes
        onClick={() => setOpen(false)}
        className="home-menu-icon"
        size={40}
      />
      {getMenuItems()}
    </div>
  );
};

export default Menu;
