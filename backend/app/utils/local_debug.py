"""
Local Debugging Util for Debugging at Scale
"""


class _SpoofLogger:
    def debug(msg: str):
        """
        Spoof debug function to avoid errors in production.
        """
        pass


class _LocalLogger:
    def __init__(self, output_file: str = 'test.txt'):
        """
        Initialize the LocalLogger.
        """
        self._out_file = output_file

        self.debug("Local Debugging Logger Initialized. Output file: " + self._out_file, overwrite=True)
        self.debug('\n\n=== get_portfolio_history DEBUG START ===\n')

    def debug(self, msg: str, overwrite = False) -> None:
        """
        Local logger for debugging purposes.
        """
        with open(self._out_file, 'w' if overwrite else 'a') as f:
            f.write(str(msg))
            f.write('\n')


def setup_logger(debug: bool, output_file: str):
    """
    Setup logger for debugging purposes.
    If debug is True, it initializes a LocalLogger.
    Otherwise, it uses Spoof to avoid errors in production.
    """
    if debug:
        return _LocalLogger(output_file)
    else:
        return _SpoofLogger()