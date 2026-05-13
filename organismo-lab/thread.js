async function executeThreadsAndFunctions(initialThread) {
  const element = diarsaba.get(initialThread);
  await element[0] === "thread" ? recursiveThread(element) : execute(element);
}

async function recursiveThread(threadElement) {
  for (let i = 1; i < threadElement.length; i++) {
    const elementName = threadElement[i];
    if (elementName.includes("!")) continue;
    
    try {
      const element = diarsaba.get(elementName);
      await element[0] === "thread" ? recursiveThread(element) : execute(element);
    } catch {
      console.log(`'${elementName}' not found in thread`);
    }
  }
}

async function execute([type, func, ...params]) {
  try {
    await diarsaba.get(func)(...params);
  } catch {
    console.log(`Function '${func}' not found`);
  }
}
