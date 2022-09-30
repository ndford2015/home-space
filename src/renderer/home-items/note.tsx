/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState, useCallback, useEffect } from 'react';
import RichTextEditor from 'react-rte';
import { debounce } from 'renderer/utils';
import './item.global.scss';

interface NoteItemProps {
  onChange(val: string): void;
  defaultVal: string;
}
const Note = (props: NoteItemProps) => {
  const { defaultVal } = props;
  const [value, setValue] = useState(
    defaultVal
      ? RichTextEditor.createValueFromString(defaultVal, 'markdown')
      : RichTextEditor.createEmptyValue()
  );
  const debouncedOnChange: any = useCallback(
    debounce((val: any) => props.onChange(val.toString('markdown')), 3000),
    [props]
  );
  const onChange = (val: any) => {
    setValue(val);
    debouncedOnChange(val);
  };

  return (
    <RichTextEditor
      autoFocus
      className="notepad-container"
      value={value}
      onChange={onChange}
    />
  );
};

export default Note;
