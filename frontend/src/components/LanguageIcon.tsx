import React from 'react';
import { 
  SiJavascript, SiTypescript, SiPython, SiCplusplus, 
  SiC, SiCsharp, SiPhp, SiRuby, SiGo, SiRust, SiSwift, 
  SiHtml5, SiCss3, SiMarkdown, SiJson, SiYaml,
  SiReact, SiGit, SiDocker
} from 'react-icons/si';
import { DiJava } from 'react-icons/di';
import { VscTerminalBash, VscCode } from 'react-icons/vsc';
import { FiFile, FiSettings } from 'react-icons/fi';
import { AiOutlineConsoleSql } from 'react-icons/ai';

interface LanguageIconProps {
  language: string;
  size?: number;
  className?: string;
}

const LanguageIcon: React.FC<LanguageIconProps> = ({ 
  language, 
  size = 24,
  className = ""
}) => {
  // Map language names to their respective icons
  const getIcon = () => {
    const iconProps = { size, className: `inline-block ${className}` };
    
    // Normalize language name for matching
    const lang = language.toLowerCase();
    
    if (lang.includes('javascript') || lang === 'js') {
      return <SiJavascript {...iconProps} className={`${iconProps.className} text-yellow-400`} />;
    } else if (lang.includes('typescript') || lang === 'ts') {
      return <SiTypescript {...iconProps} className={`${iconProps.className} text-blue-500`} />;
    } else if (lang.includes('python') || lang === 'py') {
      return <SiPython {...iconProps} className={`${iconProps.className} text-blue-600`} />;
    } else if (lang.includes('java') && !lang.includes('javascript')) {
      return <DiJava {...iconProps} className={`${iconProps.className} text-red-500`} />;
    } else if (lang.includes('c++') || lang.includes('cpp')) {
      return <SiCplusplus {...iconProps} className={`${iconProps.className} text-purple-600`} />;
    } else if (lang === 'c' || lang.includes('clang')) {
      return <SiC {...iconProps} className={`${iconProps.className} text-blue-800`} />;
    } else if (lang.includes('c#') || lang.includes('csharp')) {
      return <SiCsharp {...iconProps} className={`${iconProps.className} text-green-600`} />;
    } else if (lang.includes('php')) {
      return <SiPhp {...iconProps} className={`${iconProps.className} text-indigo-600`} />;
    } else if (lang.includes('ruby')) {
      return <SiRuby {...iconProps} className={`${iconProps.className} text-red-600`} />;
    } else if (lang.includes('go')) {
      return <SiGo {...iconProps} className={`${iconProps.className} text-cyan-600`} />;
    } else if (lang.includes('rust')) {
      return <SiRust {...iconProps} className={`${iconProps.className} text-orange-700`} />;
    } else if (lang.includes('swift')) {
      return <SiSwift {...iconProps} className={`${iconProps.className} text-orange-500`} />;
    } else if (lang.includes('html')) {
      return <SiHtml5 {...iconProps} className={`${iconProps.className} text-orange-600`} />;
    } else if (lang.includes('css')) {
      return <SiCss3 {...iconProps} className={`${iconProps.className} text-blue-400`} />;
    } else if (lang.includes('react')) {
      return <SiReact {...iconProps} className={`${iconProps.className} text-cyan-400`} />;
    } else if (lang.includes('markdown') || lang === 'md') {
      return <SiMarkdown {...iconProps} className={`${iconProps.className} text-gray-600`} />;
    } else if (lang.includes('json')) {
      return <SiJson {...iconProps} className={`${iconProps.className} text-yellow-600`} />;
    } else if (lang.includes('yaml') || lang.includes('yml')) {
      return <SiYaml {...iconProps} className={`${iconProps.className} text-red-300`} />;
    } else if (lang.includes('xml')) {
      return <FiFile {...iconProps} className={`${iconProps.className} text-orange-400`} />;
    } else if (lang.includes('sql')) {
      return <AiOutlineConsoleSql {...iconProps} className={`${iconProps.className} text-blue-300`} />;
    } else if (lang.includes('bash') || lang.includes('shell') || lang.includes('sh')) {
      return <VscTerminalBash {...iconProps} className={`${iconProps.className} text-gray-500`} />;
    } else if (lang.includes('git') || lang.includes('ignore')) {
      return <SiGit {...iconProps} className={`${iconProps.className} text-orange-600`} />;
    } else if (lang.includes('docker')) {
      return <SiDocker {...iconProps} className={`${iconProps.className} text-blue-500`} />;
    } else if (lang.includes('config') || lang.includes('environment') || lang.includes('env')) {
      return <FiSettings {...iconProps} className={`${iconProps.className} text-gray-500`} />;
    } else {
      // Default fallback
      return <VscCode {...iconProps} className={`${iconProps.className} text-gray-500`} />;
    }
  };

  return getIcon();
};

export default LanguageIcon; 