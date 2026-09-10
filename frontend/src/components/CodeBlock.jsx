import React from 'react';

const CodeBlock = ({ code, language, title }) => {
    return (
        <div className="rounded-lg overflow-hidden border border-gray-700 bg-gray-900 shadow-md">
            {title && (
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                    <span className="text-gray-300 font-mono text-sm">{title}</span>
                    <span className="text-xs text-gray-500 uppercase">{language}</span>
                </div>
            )}
            <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-sm leading-relaxed text-gray-100">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
};

export default CodeBlock;
