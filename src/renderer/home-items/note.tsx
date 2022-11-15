/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { useState, useCallback } from 'react';
import RichTextEditor from 'react-rte';
import { EditorState } from 'draft-js';
import { stateFromMarkdown } from 'draft-js-import-markdown';
import { FaTag, FaPlus } from 'react-icons/fa';
import { debounce } from '../utils';
import './item.global.scss';

interface NoteItemProps {
  onChange(val: string): void;
  defaultVal: string;
  tags: string[];
}
const Note = (props: NoteItemProps) => {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  const createFromString = (markup: string, format: string, options?) => {
    const contentState = stateFromMarkdown(markup, options);
    const editorState = EditorState.createWithContent(
      contentState,
      RichTextEditor.decorator
    );
    return new RichTextEditor.EditorValue(editorState, { [format]: markup });
  };

  const toggleTagDropdown = () => {
    setTagDropdownOpen(!tagDropdownOpen);
  };

  const createTag = (tagName: string) => {};

  const addTagButton = (
    _setCustomControlState: (key: string, value: string) => void,
    _getCustomControlState: (key: string) => string,
    _editorState: EditorState
  ) => {
    return (
      <div className="custom-control" onClick={toggleTagDropdown}>
        <FaTag />
        {tagDropdownOpen && (
          <div className="tag-list">
            <div>
              <FaPlus />
              <span>Add New</span>
            </div>
            {props.tags.map((tag) => (
              <div key={tag}>{tag}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const setDefaultVal = () => {
    const { defaultVal } = props;
    return defaultVal
      ? createFromString(defaultVal, 'markdown')
      : RichTextEditor.createEmptyValue();
  };

  const [value, setValue] = useState(setDefaultVal);

  const debouncedOnChange = useCallback(
    debounce(
      (val) => props.onChange(val.toString('markdown', { gfm: true })),
      3000
    ),
    [props]
  );

  const onChange = (val) => {
    setValue(val);
    debouncedOnChange(val);
  };

  return (
    <RichTextEditor
      customControls={[addTagButton]}
      autoFocus
      className="notepad-container"
      value={value}
      onChange={onChange}
    />
  );
};

export default Note;
